import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useCreateUser } from "../api/user-queries"
import { newUserSchema, type NewUser, type NewUserInput } from "../schemas/user-schema"
import { ROLES } from "../types/user"

export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const createUser = useCreateUser()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewUserInput, unknown, NewUser>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { name: "", email: "", role: "viewer" },
  })

  const onSubmit: SubmitHandler<NewUser> = async (values) => {
    try {
      const user = await createUser.mutateAsync(values)
      toast.success(`Added ${user.name}`)
      reset()
      setOpen(false)
    } catch (error) {
      setError("root.server", { message: error instanceof Error ? error.message : "Could not add the user." })
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add user</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>The user appears in the table right away.</DialogDescription>
          </DialogHeader>
          <form id="create-user" noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-name">Name</Label>
              <Input id="user-name" aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "user-name-error" : undefined} {...register("name")} />
              {errors.name && (
                <p id="user-name-error" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "user-email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="user-email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="user-role">Role</Label>
              <select id="user-role" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm" {...register("role")}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            {errors.root?.server && (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.server.message}
              </p>
            )}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-user" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
